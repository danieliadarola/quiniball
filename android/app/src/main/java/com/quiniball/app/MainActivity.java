package com.quiniball.app;

import android.os.Bundle;
import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Asegura que el WebView acepte y CONSERVE las cookies (incluida la de
        // sesión httpOnly) para no tener que iniciar sesión cada vez.
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Vuelca las cookies a disco al pausar la app, de modo que la sesión
        // sobreviva al cierre/reinicio de la aplicación.
        CookieManager.getInstance().flush();
    }
}
