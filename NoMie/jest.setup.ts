// No native safe-area module under Jest: the library's mock gives zero insets, with or without a provider.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
