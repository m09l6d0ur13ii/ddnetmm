window.ignoredFinishesData = [
  ".x0r*|2 days in the back"
];

window.isIgnoredFinish = function(player, map) {
  if (!player || !map) return false;
  const key = String(player).trim().toLowerCase() + '|' + String(map).trim().toLowerCase();
  return window.ignoredFinishesData && window.ignoredFinishesData.includes(key);
};
