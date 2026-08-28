/**
 * @bahikhata/ui — design system.
 *
 * Consumed as source and transpiled by Next (`transpilePackages`), so there is
 * no build step here during Phase 0–1.
 *
 * Components take data as props and never query. Anything that needs routing
 * (`next/link`) is injected, so this package stays framework-light.
 */

export { cn } from './lib/cn';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  StatCard,
} from './components/card';
export { Field, FormError, Input, Label, Select, type FieldProps } from './components/field';
export { ThemeScript, ThemeToggle, type Theme } from './components/theme';
export { AppShell, type AppShellProps, type NavItem } from './components/app-shell';
