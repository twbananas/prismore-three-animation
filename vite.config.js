export default {
  build: {
    rollupOptions: {
      external: [
        "three/examples/jsm/loaders/DRACOLoader.js",
        "three/examples/jsm/libs/draco/"
      ]
    }
  }
};
