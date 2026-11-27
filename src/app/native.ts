import { App } from '@capacitor/app'
import { SystemBars } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useGame } from '../game/store'
import { backAction } from './backButton'

type Router = { state: { location: { pathname: string } } }

/** Inside the Android app only: the back button, full screen, the status bar colours, and hiding the splash once the game shows. */
export function startNative(router: Router) {
  void App.addListener('backButton', () => {
    const action = backAction(useGame.getState(), router.state.location.pathname)
    if (action === 'exit') void App.exitApp()
    else if (action === 'back') window.history.back()
    else if (action !== 'ignore') useGame.setState(action.patch)
  })
  // A game plays full screen: hide the status and navigation bars (a swipe from the edge shows them for a moment).
  // Leaving the app or pulling down a notification brings them back, so hide them again each time it returns.
  const fullScreen = () => void SystemBars.hide().catch(() => {})
  fullScreen()
  void App.addListener('resume', fullScreen)
  // Dark icons for when the bars do show: the app draws edge to edge, so the light pages show behind them.
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  void SplashScreen.hide().catch(() => {})
}
