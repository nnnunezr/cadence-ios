package com.unio.cadence;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Lightweight capture dialog launched from the home-screen widget. Appends the
 * typed text to a JSON queue stored in the same SharedPreferences file the
 * Capacitor Preferences plugin reads ("CapacitorStorage"), so the web layer can
 * pull it into the notes database without a custom native bridge.
 */
public class QuickNoteActivity extends Activity {

    private static final String PREFS = "CapacitorStorage";
    private static final String QUEUE_KEY = "cadence_quicknote_queue";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_quick_note);
        getWindow().setLayout(WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT);

        final EditText input = findViewById(R.id.qn_input);
        Button save = findViewById(R.id.qn_save);
        Button cancel = findViewById(R.id.qn_cancel);

        cancel.setOnClickListener(view -> finish());
        save.setOnClickListener(view -> {
            String text = input.getText().toString().trim();
            if (TextUtils.isEmpty(text)) {
                finish();
                return;
            }
            enqueue(this, text);
            Toast.makeText(this, "Saved to Cadence", Toast.LENGTH_SHORT).show();
            finish();
        });
    }

    private static void enqueue(Context ctx, String text) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray arr;
        try {
            arr = new JSONArray(sp.getString(QUEUE_KEY, "[]"));
        } catch (JSONException e) {
            arr = new JSONArray();
        }
        try {
            JSONObject o = new JSONObject();
            o.put("text", text);
            o.put("ts", System.currentTimeMillis());
            arr.put(o);
        } catch (JSONException ignored) {
        }
        sp.edit().putString(QUEUE_KEY, arr.toString()).apply();
    }
}
