# AppSire ERP Marketing Website

A modern, responsive marketing website for AppSire ERP built with React, TypeScript, and Tailwind CSS.

## Pages

- **Home** - Hero section, feature highlights, testimonials, and CTAs
- **Features** - Detailed breakdown of all ERP modules and capabilities
- **Pricing** - Tiered subscription plans with feature comparison
- **About** - Company story, values, team, and milestones
- **Contact** - Contact form and information
- **Privacy Policy** - GDPR-compliant privacy policy
- **Terms of Service** - Service terms and conditions

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide Icons

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Built files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t appsire-website .
```

### Run Container

```bash
docker run -p 3000:80 appsire-website
```

The website will be available at `http://localhost:3000`

### Using Docker Compose

From the repo root directory:

```bash
# Run only the website
docker-compose --profile website up website

# Run with full ERP stack
docker-compose --profile website up
```

## Project Structure

```
website/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   ├── Privacy.tsx
│   │   └── Terms.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── Dockerfile
├── nginx.conf
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Customization

### Colors

Edit `tailwind.config.js` to customize the color palette:

```js
colors: {
  primary: { ... },
  accent: { ... },
}
```

### Fonts

The site uses Inter and Plus Jakarta Sans fonts from Google Fonts. To change fonts, update:
1. `index.html` - Google Fonts link
2. `tailwind.config.js` - fontFamily configuration

### Content

All content is defined within the page components. Edit the data arrays and JSX in each page file to update content.

## License

Copyright AppSire Inc. All rights reserved.
