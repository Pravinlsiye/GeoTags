/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App from './App.tsx'
import UploadPage from './pages/UploadPage.tsx'
import CameraPage from './pages/CameraPage.tsx'

const root = document.getElementById('root')

render(
  () => (
    <Router root={App}>
      <Route path="/" component={UploadPage} />
      <Route path="/camera" component={CameraPage} />
    </Router>
  ),
  root!,
)
