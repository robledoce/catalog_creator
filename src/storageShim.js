/* Shim de window.storage (API de artifacts de Claude.ai) sobre localStorage,
   para poder correr el componente como app web normal. */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const value = window.localStorage.getItem(key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return true;
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return true;
    },
  };
}
