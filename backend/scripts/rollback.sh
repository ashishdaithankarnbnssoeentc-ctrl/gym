#!/bin/bash

# Rollback Script for Elite Fitness Backend
# Automated rollback to last known good deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_ID="${RENDER_SERVICE_ID}"
API_KEY="${RENDER_API_KEY}"
BACKEND_URL="https://elite-fitness-backend.onrender.com"
FRONTEND_URL="https://elite-fitness.vercel.app"

# Logging function
log() {
    echo -e "${NC}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if environment variables are set
check_env() {
    log "Checking environment variables..."
    
    if [[ -z "$SERVICE_ID" ]]; then
        error "RENDER_SERVICE_ID environment variable is required"
        exit 1
    fi
    
    if [[ -z "$API_KEY" ]]; then
        error "RENDER_API_KEY environment variable is required"
        exit 1
    fi
    
    success "Environment variables check passed"
}

# Health check function
health_check() {
    local url="$1"
    local max_attempts=10
    local attempt=1
    
    log "Performing health check on $url..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null; then
            success "Health check passed on attempt $attempt"
            return 0
        fi
        
        warning "Health check attempt $attempt failed"
        sleep 30
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Get current deployment info
get_current_deployment() {
    log "Getting current deployment info..."
    
    local response=$(curl -s -H "Authorization: Bearer $API_KEY" \
        "https://api.render.com/v1/services/$SERVICE_ID")
    
    if [[ $? -ne 0 ]]; then
        error "Failed to get current deployment info"
        exit 1
    fi
    
    echo "$response"
}

# Trigger rollback
trigger_rollback() {
    log "Triggering rollback to previous deployment..."
    
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"rollback": true}' \
        "https://api.render.com/v1/services/$SERVICE_ID/rollback")
    
    if [[ $? -ne 0 ]]; then
        error "Failed to trigger rollback"
        exit 1
    fi
    
    success "Rollback triggered successfully"
    log "Response: $response"
    
    # Wait for rollback to complete
    log "Waiting for rollback to complete..."
    sleep 60
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    if health_check "$BACKEND_URL"; then
        success "Backend rollback verified"
    else
        error "Backend rollback verification failed"
        return 1
    fi
    
    # Test critical endpoints
    log "Testing critical endpoints..."
    
    local endpoints=(
        "$BACKEND_URL/"
        "$BACKEND_URL/api/content"
        "$BACKEND_URL/api/media/stats"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            success "Endpoint $endpoint is working"
        else
            error "Endpoint $endpoint failed"
            return 1
        fi
    done
    
    success "All critical endpoints are working"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    log "Sending notification: $message"
    
    # You can integrate with Slack, Discord, email, etc.
    # For now, just logging
    if [[ "$status" == "success" ]]; then
        success "$message"
    else
        error "$message"
    fi
}

# Main rollback function
main() {
    log "Starting rollback process..."
    
    # Check prerequisites
    check_env
    
    # Get current deployment info
    local current_deployment=$(get_current_deployment)
    log "Current deployment: $current_deployment"
    
    # Trigger rollback
    trigger_rollback
    
    # Verify rollback
    if verify_rollback; then
        send_notification "success" "Rollback completed successfully"
        success "Rollback process completed"
        
        log "Services status:"
        log "Backend: $BACKEND_URL"
        log "Frontend: $FRONTEND_URL"
        
        exit 0
    else
        send_notification "failure" "Rollback verification failed"
        error "Rollback process failed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "check")
        check_env
        health_check "$BACKEND_URL"
        ;;
    "rollback")
        main
        ;;
    "health")
        health_check "$BACKEND_URL"
        ;;
    *)
        echo "Usage: $0 {check|rollback|health}"
        echo "  check    - Check environment and health"
        echo "  rollback - Perform full rollback"
        echo "  health   - Health check only"
        exit 1
        ;;
esac
