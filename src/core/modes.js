// Tiny mode registry. The arena's rAF loop is the app heartbeat; when
// another mode is current, the arena delegates its frame to that mode's
// tick instead of simulating/rendering itself.
export const modes = {
  current: 'arena',       // 'arena' | 'explore'
  ticks: {},              // name -> (dt) => void
  register(name, tick) { this.ticks[name] = tick; },
  enter(name) { this.current = name; },
};
