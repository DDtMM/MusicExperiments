/** Cancels an event (if it is cancellable). */
export function cancelEvent(evt: Event) {
  evt.stopPropagation();
  if (evt.cancelable) {
    evt.preventDefault();
  }
  // else {
  //   console.log('couldnt cancel.')
  // }
}
