import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { TenantQueryBuilder } from '../middleware/tenant.js';

// Tenant-aware content controller
export const getContent = async (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    
    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .eq('tenant_id', queryBuilder.tenantId)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Content fetch error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch content'
      });
    }
    
    res.json({
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Content controller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch content'
    });
  }
};

// Tenant-aware favorites controller
export const getFavorites = async (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('favorites')
      .select(`
        *,
        content:content_id (
          id,
          title,
          description,
          category,
          created_at
        )
      `, { count: 'exact' })
      .eq('tenant_id', queryBuilder.tenantId)
      .eq('user_id', queryBuilder.userId)
      .order('created_at', { ascending: false });
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Favorites fetch error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch favorites'
      });
    }
    
    res.json({
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Favorites controller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch favorites'
    });
  }
};

// Tenant-aware proposals controller
export const getProposals = async (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = supabase
      .from('proposals')
      .select('*', { count: 'exact' })
      .eq('tenant_id', queryBuilder.tenantId)
      .eq('user_id', queryBuilder.userId)
      .order('created_at', { ascending: false });
    
    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Proposals fetch error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch proposals'
      });
    }
    
    res.json({
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Proposals controller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch proposals'
    });
  }
};

// Admin-only tenant management
export const getTenantUsers = async (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => {
  try {
    // Only admins can access this
    if (req.tenant?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('users')
      .select('id, email, display_name, role, created_at', { count: 'exact' })
      .eq('tenant_id', queryBuilder.tenantId)
      .order('created_at', { ascending: false });
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Tenant users fetch error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch tenant users'
      });
    }
    
    res.json({
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Tenant users controller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch tenant users'
    });
  }
};

// Create content with tenant isolation
export const createContent = async (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => {
  try {
    const { title, description, category, tags } = req.body;
    
    const { data, error } = await supabase
      .from('content')
      .insert({
        title,
        description,
        category,
        tags,
        tenant_id: queryBuilder.tenantId,
        created_by: queryBuilder.userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Content creation error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create content'
      });
    }
    
    console.log(`[${new Date().toISOString()}] CONTENT CREATED: ${data.id} by user ${queryBuilder.userId} in tenant ${queryBuilder.tenantId}`);
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Content creation controller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create content'
    });
  }
};
