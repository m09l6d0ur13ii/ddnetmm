window.ignoredFinishesData = [
  ".x0r*|2 days in the back",
  "асхаб та|excast 4",
  "асхаб та|the fusion",
  "асхаб та|behemoth",
  "асхаб та|genericore 1",
  "асхаб та|milkyway",
  "асхаб та|just triple fly",
  "асхаб та|stronghold 4 [final]",
  "асхаб та|ton 2",
  "асхаб та|necron"
];

window.isIgnoredFinish = function(player, map) {
  if (!player || !map) return false;
  const key = String(player).trim().toLowerCase() + '|' + String(map).trim().toLowerCase();
  return window.ignoredFinishesData && window.ignoredFinishesData.includes(key);
};
