# Visual/Atmosphere Performance
Single canvas + single rAF verified previously (atmosphere QA). visibilitychange pause, DPR≤1.5, bounded particles, no per-frame React state. Cursor-light writes skipped when settled. No new loops added by missions/visualizer/projects pages (Visualizer playback uses setInterval only while Playing, cleared on pause/unmount-via-pick). PASS — unchanged.
