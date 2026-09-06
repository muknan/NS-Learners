import '@testing-library/jest-dom/vitest';

// jsdom has no top-layer dialog implementation; browser tests cover focus and inertness.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
