package com.unio.cadence;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Home-screen widget for quick notes. The "＋ New note" button opens a tiny
 * capture dialog ({@link QuickNoteActivity}); the title opens the full app.
 * Notes captured from the widget are queued in SharedPreferences and drained
 * into the app's database the next time the WebView comes to the foreground.
 */
public class QuickNoteWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_quick_note);

            Intent add = new Intent(context, QuickNoteActivity.class);
            add.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent addPi = PendingIntent.getActivity(
                    context, 0, add,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.widget_add, addPi);

            Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (open != null) {
                PendingIntent openPi = PendingIntent.getActivity(
                        context, 1, open,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                v.setOnClickPendingIntent(R.id.widget_open, openPi);
            }

            mgr.updateAppWidget(id, v);
        }
    }
}
