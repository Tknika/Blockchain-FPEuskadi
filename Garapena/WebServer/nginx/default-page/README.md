# Default Landing Page for blockchain.tkn.eus

This directory contains the default landing page that will be served when accessing `blockchain.tkn.eus` or when no other server_name matches in nginx.

## Files

- `index.html` - Main landing page with links to all services
- `style.css` - Stylesheet with responsive design and modern UI

## Production Deployment Instructions

### Automatic Deployment (Docker Compose - Recommended)

The default landing page is **automatically deployed** when the nginx container starts via Docker Compose. The files are mounted directly from this directory into the container.

#### Steps:

### 1. Ensure files are in place

Make sure these files exist in this directory:
- `index.html`
- `style.css`

### 2. Verify nginx configuration

The nginx configuration in `conf.d/produkzioa/default.conf` is already configured to:
- Serve the default page from `/var/www/default`
- Use the `blockchain.tkn.eus` certificate
- Redirect HTTP to HTTPS
- Add security headers

### 3. Deploy/Restart the nginx container

```bash
cd Garapena/WebServer
docker-compose up -d webserver
```

That's it! The landing page is automatically available at `/var/www/default` inside the container.

### 4. Verify SSL certificate

Make sure the blockchain.tkn.eus domain is included in your Let's Encrypt certificate:

```bash
sudo certbot certificates
```

If not, you may need to add it:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d blockchain.tkn.eus \
  --expand
```

---

## Features

- **Simple Design**: Clean, minimal text-based layout
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Service Directory**: Direct links to all available services:
  - Ziurtagiriak (Certificates)
  - Formakuntzak (Training)
  - Etiketa (Labeling)
  - Ethstats (Network statistics)
  - Mail Server
  - CheckMK (Monitoring)
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **SEO Optimized**: Proper meta tags and semantic HTML
- **Performance**: Static files with caching enabled

## Customization

To customize the landing page:

1. Edit `index.html` to change content, add/remove services
2. Edit `style.css` to modify colors, layout, or styling
3. The main accent color is `#0066cc` - change this throughout the CSS to rebrand

## Testing

Access the landing page at:
- https://blockchain.tkn.eus

Any undefined subdomain will automatically redirect to blockchain.tkn.eus:
- https://undefined.blockchain.tkn.eus → redirects to → https://blockchain.tkn.eus
- https://random.blockchain.tkn.eus → redirects to → https://blockchain.tkn.eus

## Troubleshooting

If the page doesn't load:

1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify file permissions: `ls -la /var/www/default`
3. Test nginx config: `sudo nginx -t`
4. Check SSL certificate is valid: `openssl s_client -connect blockchain.tkn.eus:443 -servername blockchain.tkn.eus`

