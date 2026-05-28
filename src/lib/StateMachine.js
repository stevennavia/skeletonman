export class StateMachine {
  constructor(owner, initialState) {
    this.owner = owner;
    this.state = initialState;
    this.previous = null;
    this.states = {};
    this.frame = 0;
  }

  addState(name, callbacks) {
    this.states[name] = callbacks;
    return this;
  }

  setState(name, ...args) {
    if (this.state === name && this.states[name]?.blockReEnter) return;
    const prev = this.states[this.state];
    if (prev?.exit) prev.exit.call(this.owner, ...args);
    this.previous = this.state;
    this.state = name;
    this.frame = 0;
    const next = this.states[name];
    if (next?.enter) next.enter.call(this.owner, ...args);
  }

  update(delta, ...args) {
    const current = this.states[this.state];
    if (current?.update) current.update.call(this.owner, delta, ...args);
    this.frame++;
  }

  is(name) {
    return this.state === name;
  }

  was(name) {
    return this.previous === name;
  }

  frameCount() {
    return this.frame;
  }
}
