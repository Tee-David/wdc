/** One writer per browser form. Reset waits for cookie-setting responses first. */
export class DraftLifecycle {
  private tail: Promise<unknown> = Promise.resolve();
  private version = 0;
  resetting = false;
  current(version:number) { return version === this.version && !this.resetting; }
  run<T>(work:(version:number)=>Promise<T>):Promise<T> {
    const version = this.version;
    if (this.resetting) return Promise.reject(new Error("The form is restarting. Please wait."));
    const result = this.tail.then(() => {
      if (!this.current(version)) throw new Error("That save was cancelled by Start over.");
      return work(version);
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
  async beginReset() { this.resetting = true; this.version++; await this.tail; }
  endReset() { this.resetting = false; }
}
