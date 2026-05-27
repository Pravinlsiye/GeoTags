import type { RouteSectionProps } from '@solidjs/router'
import AppShell from './components/AppShell'

export default function App(props: RouteSectionProps) {
  return <AppShell>{props.children}</AppShell>
}
