import { useCallback, useState } from "react";
import App from "./App";
import { PetrominSplash } from "./components/PetrominSplash";

export function PetrominRoot() {
  const [appVisible, setAppVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const handleRevealApp = useCallback(() => {
    // Intentionally left blank to keep the main app unmounted during the splash.
  }, []);

  const handleSplashFinish = useCallback(() => {
    setAppVisible(true);
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && (
        <PetrominSplash onRevealApp={handleRevealApp} onFinish={handleSplashFinish} />
      )}
      <div id="app" className={`petromin-app${appVisible ? " is-visible" : ""}`}>
        {appVisible ? (
          <App />
        ) : (
          <div className="petromin-main-placeholder" role="main">
            Main App
          </div>
        )}
      </div>
    </>
  );
}
