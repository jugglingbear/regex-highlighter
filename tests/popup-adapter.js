// Test-only browser preview: exercises the actual popup module and local persistence.
window.chrome = {
  storage: { local: {
    get: async () => JSON.parse(localStorage.getItem('popup-test-rules') || '{}'),
    set: async update => localStorage.setItem('popup-test-rules', JSON.stringify({...JSON.parse(localStorage.getItem('popup-test-rules') || '{}'), ...update}))
  } },
  tabs: {query: async () => [{id:1}]},
  scripting: {executeScript: async ({func,args}) => [{result:func(...args)}]}
};
await import('../popup.js');
