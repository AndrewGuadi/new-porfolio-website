const paths = {
logo:'<path d="M2.7 13.1 12 4.6l9.3 8.5M6.2 11v8.1h4.1v-4.7h3.4v4.7h4.1V11"/><path d="M15.9 4.8A8.8 8.8 0 0 1 20 8.4"/>',
cube:'<path d="m12 2.9 8 4.6v9l-8 4.6-8-4.6v-9zM4 7.5l8 4.7 8-4.7M12 12.2v8.9M8.1 5.1l8 4.6"/>',
mic:'<rect x="9" y="2.9" width="6" height="12" rx="3"/><path d="M5.7 10.2v1.3a6.3 6.3 0 0 0 12.6 0v-1.3M12 17.9v3.2m-3.3 0h6.6"/>',
guide:'<circle cx="12" cy="12" r="8.7"/><path d="M9.6 9.4a2.5 2.5 0 1 1 4.2 1.8c-1.2.9-1.8 1.2-1.8 2.8m0 2.4v.1"/>',
pendant:'<path d="M12 2v3.5M7.4 8.2 12 5.5l4.6 2.7M5 11.4l2.4-3.2m9.2 0 2.4 3.2"/><ellipse cx="12" cy="12" rx="8.3" ry="2.5"/><path d="M7.3 16.5c1.9 2 7.5 2 9.4 0"/>',
cove:'<path d="m3.7 16.7 8.3-9.1 8.3 9.1M5 19.6l7-7.5 7 7.5M12 2.4v2M3.7 8.9l1.5 1.4m15.1-1.4-1.4 1.4"/>',
lamp:'<path d="M7.4 3.5h9.2l2.1 8.1H5.3zM12 11.6v8.7m-4 0h8m.6-8.3v2.7"/>',
shelf:'<path d="M3.1 10.5h17.8M3.1 19.5h17.8M5.3 8.6V4.1h3.1v4.5m2-4.5v4.5m4.3-4.1 2.4 4.1M6.1 17.5v-3m3.2-.2v3.2m4.3-.2 2.5-3.5 2.5 3.5"/>',
spot:'<path d="M3.6 5h16.8M7 7h10l-1.6 3.2H8.6zM12 13v5.5m-4.8-5.8-2.1 4.5m11.7-4.5 2.1 4.5"/>',
tv:'<rect x="2.8" y="4.4" width="18.4" height="12.1" rx="1.5"/><path d="M12 16.5v3m-4 0h8"/>',
fire:'<path d="M12.8 2.8c1.4 4.8-2.7 6.1-1.8 9.1 1.8-.4 3.4-2.2 3.6-4.1 2.1 1.9 4.5 4.7 4.5 7.3A7 7 0 0 1 5 15c0-2.6 1.4-5.4 3.7-7.6-.1 2.1.4 3.4 1.2 3.8-.2-3 2.8-5.2 2.9-8.4z"/>',
audio:'<path d="M4.2 9.2h3.4l4.7-4v13.6l-4.7-4H4.2zM16 8.8a4.5 4.5 0 0 1 0 6.4M18.6 5.7a8.8 8.8 0 0 1 0 12.6"/>',
shades:'<path d="M4 3.7h16v2.7H4zM5.5 6.5v9.7h13V6.5M5.5 10h13m-13 3h13m1.4-6.2V18M5 20h14"/>',
tablet:'<rect x="3.1" y="5" width="17.8" height="14" rx="1.8"/><path d="M10.7 16.4h2.6"/>',
security:'<path d="M12 3.2c2.5 2.1 5 2.7 7.2 3.1v5.8c0 4.1-3.1 6.8-7.2 8.9-4.1-2.1-7.2-4.8-7.2-8.9V6.3c2.2-.4 4.7-1 7.2-3.1z"/><path d="m8.7 12 2.1 2.1 4.7-4.7"/>',
temp:'<path d="M9.5 6a2.5 2.5 0 0 1 5 0v7.2a4.3 4.3 0 1 1-5 0zM12 8v8m5.3-8h2m-2 3h1.5"/>',
state:'<path d="M3 12h4l2.2-5.2 4.2 10.6 2.8-6h4.8"/>',
sliders:'<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
chevron:'<path d="m7 10 5 5 5-5"/>', rchev:'<path d="m9.2 6 6 6-6 6"/>',
expand:'<path d="M4.5 9V4.5H9M15 4.5h4.5V9m0 6v4.5H15m-6 0H4.5V15"/>',
contract:'<path d="M9 4.5V9H4.5M19.5 9H15V4.5m0 15V15h4.5m-15 0H9v4.5"/>',
pins:'<circle cx="12" cy="12" r="5.8"/><circle cx="12" cy="12" r="1.4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
eye:'<path d="M2.4 12s3.2-6 9.6-6 9.6 6 9.6 6-3.2 6-9.6 6-9.6-6-9.6-6z"/><circle cx="12" cy="12" r="2.4"/>',
camera:'<path d="M3.3 7.3h4l1.8-2.6h5.8l1.8 2.6h4v11.5H3.3z"/><circle cx="12" cy="12.8" r="3.3"/>',
minus:'<path d="M5.5 12h13"/>', plus:'<path d="M5.5 12h13M12 5.5v13"/>', check:'<path d="m5.2 12.6 4.1 4.1 9.5-10"/>',
move:'<path d="M12 3v18M3 12h18M8.7 6.3 12 3l3.3 3.3M8.7 17.7 12 21l3.3-3.3M6.3 8.7 3 12l3.3 3.3m11.4-6.6L21 12l-3.3 3.3"/>',
mouse:'<rect x="6.3" y="2.7" width="11.4" height="18.6" rx="5.7"/><path d="M12 5.6v4.2"/>',
navigation:'<path d="m19.5 4.6-5.2 15-3.4-6.9L4 9.6z"/>',
sunset:'<path d="M3 16h18M5.5 19.5h13M7.2 15.1a4.8 4.8 0 1 1 9.6 0M12 3.5v2.2M4.1 8.2l1.6 1.4m12.6 0 1.6-1.4"/>',
film:'<rect x="3.4" y="5.2" width="17.2" height="13.6" rx="2"/><path d="M7.3 5.2v13.6m9.4-13.6v13.6M3.6 9.6h3.7m-3.7 4.8h3.7m9.4-4.8h3.7m-3.7 4.8h3.7"/>',
book:'<path d="M3.2 5.1c3.2-.5 6.1.1 8.8 2.1 2.7-2 5.6-2.6 8.8-2.1V18c-3.2-.5-6.1.1-8.8 2.1-2.7-2-5.6-2.6-8.8-2.1zM12 7.2v12.2"/>',
moon:'<path d="M19.7 14.3A8.3 8.3 0 0 1 9.8 3.5 8.5 8.5 0 1 0 19.7 14.3z"/><path d="M17.5 3.6v4.8m-2.4-2.4h4.8"/>',
reset:'<path d="M4.2 10.2a8 8 0 1 1 1.2 7.3M4.2 5.5v4.8H9"/>',
door:'<path d="M5 20h14M7 19.7V4.6h10v15.1m-3.6-7.4h.1"/>',
close:'<path d="m6.3 6.3 11.4 11.4m0-11.4L6.3 17.7"/>',
keyboard:'<rect x="2.7" y="5.7" width="18.6" height="12.6" rx="2"/><path d="M6 9.4h.1m3.5 0h.1m3.5 0h.1m3.5 0h.1m-10.9 3h.1m3.5 0h.1m3.5 0h.1m3.5 0h.1M8 15.5h8"/>',
up:'<path d="m6 14.5 6-6 6 6"/>', down:'<path d="m6 9.5 6 6 6-6"/>', left:'<path d="m14.5 6-6 6 6 6"/>', right:'<path d="m9.5 6 6 6-6 6"/>',
sound:'<path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/>',
power:'<path d="M12 2.8v8.4M7.3 5.8a8 8 0 1 0 9.4 0"/>',
layers:'<path d="m3.5 9 8.5-4.4L20.5 9 12 13.4zM3.5 12.6 12 17l8.5-4.4M3.5 16l8.5 4.4 8.5-4.4"/>',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cube}</svg>`;
}
export function decorateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(e => {
    e.innerHTML = icon(e.dataset.icon);
  });
}
