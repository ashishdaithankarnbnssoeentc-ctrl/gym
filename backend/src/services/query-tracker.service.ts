interface QueryTrace {
  timestamp: string;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  duration: number;
  rowsAffected?: number;
  query?: string;
  userId?: string;
  tenantId?: string;
}

interface DatabaseHeatmap {
  tables: Record<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    slowQueries: number;
    operations: {
      select: number;
      insert: number;
      update: number;
      delete: number;
    };
  }>;
  slowQueries: QueryTrace[];
  repeatedQueries: Array<{
    query: string;
    count: number;
    avgTime: number;
  }>;
}

class QueryTracker {
  private traces: QueryTrace[] = [];
  private readonly maxTraces = 500;
  private readonly slowThreshold = 200; // 200ms threshold

  // Wrap Supabase client to track queries
  wrapSupabaseClient(supabaseClient: any) {
    const originalFrom = supabaseClient.from.bind(supabaseClient);
    const originalRpc = supabaseClient.rpc?.bind(supabaseClient);

    // Track .from() queries
    supabaseClient.from = (table: string) => {
      const startTime = Date.now();
      const queryBuilder = originalFrom(table);
      
      // Wrap the query execution methods
      const wrapMethod = (method: string, originalMethod: Function) => {
        return (...args: any[]) => {
          const methodStartTime = Date.now();
          
          return originalMethod.apply(queryBuilder, args).then((result: any) => {
            const duration = Date.now() - methodStartTime;
            
            this.trackQuery({
              table,
              operation: this.detectOperation(method, args),
              duration,
              rowsAffected: this.extractRowCount(result, method),
              query: this.extractQuery(table, method, args)
            });
            
            return result;
          }).catch((error: any) => {
            const duration = Date.now() - methodStartTime;
            
            this.trackQuery({
              table,
              operation: this.detectOperation(method, args),
              duration,
              query: this.extractQuery(table, method, args)
            });
            
            throw error;
          });
        };
      };

      // Wrap common query methods
      ['select', 'insert', 'update', 'delete', 'upsert'].forEach(method => {
        if (queryBuilder[method]) {
          const original = queryBuilder[method];
          queryBuilder[method] = wrapMethod(method, original);
        }
      });

      return queryBuilder;
    };

    // Track RPC calls
    if (originalRpc && supabaseClient.rpc) {
      supabaseClient.rpc = (fnName: string, params?: any) => {
        const startTime = Date.now();
        
        return originalRpc(fnName, params).then((result: any) => {
          const duration = Date.now() - startTime;
          
          this.trackQuery({
            table: `rpc:${fnName}`,
            operation: 'select',
            duration,
            rowsAffected: this.extractRowCount(result, 'select'),
            query: `rpc.${fnName}(${JSON.stringify(params)})`
          });
          
          return result;
        }).catch((error: any) => {
          const duration = Date.now() - startTime;
          
          this.trackQuery({
            table: `rpc:${fnName}`,
            operation: 'select',
            duration,
            query: `rpc.${fnName}(${JSON.stringify(params)})`
          });
          
          throw error;
        });
      };
    }

    return supabaseClient;
  }

  private trackQuery(query: QueryTrace) {
    // Add user context if available (would be set by middleware)
    const currentContext = this.getCurrentContext();
    
    this.traces.push({
      ...query,
      ...currentContext,
      timestamp: new Date().toISOString()
    });

    // Keep only recent traces
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces);
    }

    // Log slow queries
    if (query.duration > this.slowThreshold) {
      console.warn(`[SLOW_QUERY] ${query.table}.${query.operation} - ${query.duration}ms`);
    }
  }

  private detectOperation(method: string, args: any[]): 'select' | 'insert' | 'update' | 'delete' {
    switch (method) {
      case 'select': return 'select';
      case 'insert': return 'insert';
      case 'update': return 'update';
      case 'delete': return 'delete';
      case 'upsert': return 'upsert';
      default: return 'select';
    }
  }

  private extractRowCount(result: any, operation: string): number | undefined {
    if (!result) return 0;
    
    if (operation === 'select') {
      return Array.isArray(result) ? result.length : 1;
    }
    
    if (result.count !== undefined) return result.count;
    if (result.error) return 0;
    
    return 1;
  }

  private extractQuery(table: string, operation: string, args: any[]): string {
    try {
      const columns = args[0];
      const columnsStr = columns ? (Array.isArray(columns) ? columns.join(', ') : columns) : '*';
      return `${operation} ${columnsStr} from ${table}`;
    } catch {
      return `${operation} ${table}`;
    }
  }

  private getCurrentContext() {
    // This would be set by middleware in a real implementation
    // For now, return empty object
    return {};
  }

  getHeatmap(): DatabaseHeatmap {
    const tableStats = new Map<string, any>();
    
    this.traces.forEach(trace => {
      if (!tableStats.has(trace.table)) {
        tableStats.set(trace.table, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          slowQueries: 0,
          operations: { select: 0, insert: 0, update: 0, delete: 0 }
        });
      }
      
      const stats = tableStats.get(trace.table);
      stats.count++;
      stats.totalTime += trace.duration;
      stats.slowQueries += trace.duration > this.slowThreshold ? 1 : 0;
      stats.operations[trace.operation]++;
    });

    // Calculate averages
    tableStats.forEach(stats => {
      stats.avgTime = Math.round(stats.totalTime / stats.count);
    });

    // Find slow queries
    const slowQueries = this.traces
      .filter(t => t.duration > this.slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20);

    // Find repeated queries
    const queryGroups = new Map<string, QueryTrace[]>();
    this.traces.forEach(trace => {
      if (trace.query) {
        if (!queryGroups.has(trace.query)) {
          queryGroups.set(trace.query, []);
        }
        queryGroups.get(trace.query)!.push(trace);
      }
    });

    const repeatedQueries = Array.from(queryGroups.entries())
      .filter(([_, traces]) => traces.length > 1)
      .map(([query, traces]) => ({
        query,
        count: traces.length,
        avgTime: Math.round(traces.reduce((sum, t) => sum + t.duration, 0) / traces.length)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      tables: Object.fromEntries(tableStats),
      slowQueries,
      repeatedQueries
    };
  }

  getOptimizationSuggestions(): string[] {
    const heatmap = this.getHeatmap();
    const suggestions: string[] = [];

    // Check for missing indexes (slow queries on specific tables)
    Object.entries(heatmap.tables).forEach(([table, stats]) => {
      if (stats.slowQueries > stats.count * 0.3) { // 30% slow queries
        suggestions.push(`Consider adding indexes on table: ${table}`);
      }
      
      if (stats.avgTime > 150) {
        suggestions.push(`Table ${table} has high average query time (${stats.avgTime}ms)`);
      }
    });

    // Check for repeated queries
    if (heatmap.repeatedQueries.length > 0) {
      suggestions.push(`Found ${heatmap.repeatedQueries.length} frequently repeated queries - consider caching`);
    }

    // Check for N+1 patterns
    const potentialN1Queries = heatmap.repeatedQueries.filter(q => 
      q.query.includes('select') && q.count > 10
    );
    if (potentialN1Queries.length > 0) {
      suggestions.push('Potential N+1 query patterns detected - consider batch loading');
    }

    return suggestions;
  }
}

export const queryTracker = new QueryTracker();
