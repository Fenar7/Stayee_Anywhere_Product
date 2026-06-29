<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend Developer & Designer Team Guidelines

- **Design System First**: We are implementing a global SCSS design system. All colors, typography, and foundational spacing MUST rely on the SCSS variables and mixins defined in `styles/design-system/`. Do not hardcode hex colors or arbitrary Tailwind classes if a design token exists.
- **Figma Fidelity**: Adhere strictly to the provided Figma design specs. Avoid generic shadcn/Tailwind components if they overwrite or conflict with our custom premium design layout.
- **SCSS Usage**: While Tailwind v4 is in the project, use SCSS for complex layouts, animations, and reusable component styles that belong to the global design system.
