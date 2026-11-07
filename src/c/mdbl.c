#include <pebble.h>

int main(void) {
  Window *w = window_create();
  window_stack_push(w, true);

  /*
   * Digits + slat loops need a decent slot heap.
   * App RAM on emery/gabbro is ~122 KB total — leave headroom.
   */
  ModdableCreationRecord creation = {
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4096,
    .slot = 40960,
    .chunk = 16384,
  };
  moddable_createMachine(&creation);

  window_destroy(w);
}
