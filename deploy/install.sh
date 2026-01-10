#!/bin/bash
#
# MCP-Hound Installation Script
# Installs mcp-hound as a systemd service
#

set -e

# Configuration
INSTALL_DIR="/opt/mcp-hound"
CONFIG_DIR="/etc/mcp-hound"
SERVICE_USER="mcp-hound"
SERVICE_GROUP="mcp-hound"

echo "=== MCP-Hound Installation ==="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Create service user if it doesn't exist
if ! id "$SERVICE_USER" &>/dev/null; then
    echo "Creating service user: $SERVICE_USER"
    useradd --system --no-create-home --shell /bin/false "$SERVICE_USER"
fi

# Create directories
echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"

# Copy application files
echo "Installing application to $INSTALL_DIR..."
cp -r dist/ "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cp package-lock.json "$INSTALL_DIR/"

# Install production dependencies only
echo "Installing dependencies..."
cd "$INSTALL_DIR"
npm ci --omit=dev

# Set ownership
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR"

# Install environment file if it doesn't exist
if [[ ! -f "$CONFIG_DIR/env" ]]; then
    echo "Installing default environment configuration..."
    cp deploy/env.example "$CONFIG_DIR/env"
    chmod 600 "$CONFIG_DIR/env"
    chown root:root "$CONFIG_DIR/env"
    echo "  Edit $CONFIG_DIR/env to configure the service"
fi

# Install systemd service
echo "Installing systemd service..."
cp deploy/mcp-hound.service /etc/systemd/system/
systemctl daemon-reload

# Enable and start service
echo "Enabling and starting service..."
systemctl enable mcp-hound
systemctl start mcp-hound

# Check status
echo ""
echo "=== Installation Complete ==="
echo ""
systemctl status mcp-hound --no-pager
echo ""
echo "Service is running on port 3100"
echo "Health check: curl http://localhost:3100/health"
echo "Configuration: $CONFIG_DIR/env"
echo ""
