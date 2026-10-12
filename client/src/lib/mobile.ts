import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

/**
 * Initializes native mobile optimizations for iOS and Android
 * when running inside Capacitor.
 */
export async function initMobileApp(navigateBack?: () => void) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Configure status bar color and icons
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#C52228" });
    }
  } catch (err) {
    console.warn("Mobile StatusBar initialization notice:", err);
  }

  try {
    // Dismiss splash screen once React has mounted
    await SplashScreen.hide();
  } catch (err) {
    console.warn("Mobile SplashScreen notice:", err);
  }

  // Handle hardware / gesture back button on Android
  if (Capacitor.getPlatform() === "android") {
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && navigateBack) {
        navigateBack();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }
}
