import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useGame } from '../game/store'
import { backAction } from './backButton'

type Router = { state: { location: { pathname: string } } }

/** Inside the Android app only: the back button, the status bar colours, and hiding the splash once the game shows. */
export function startNative(router: Router) {
  void App.addListener('backButton', () => {
    const action = backAction(useGame.getState(), router.state.location.pathname)
    if (action === 'exit') void App.exitApp()
    else if (action === 'back') window.history.back()
    else if (action !== 'ignore') useGame.setState(action.patch)
  })
  // Dark icons: the app draws edge to edge (Android 15+ ignores a status-bar colour), so the light pages show behind them.
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  void SplashScreen.hide().catch(() => {})
}
