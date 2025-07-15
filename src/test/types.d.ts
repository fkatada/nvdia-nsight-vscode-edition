import 'jest-extended';
import 'jest-extended-fs';

// 'jest-extended' only registers types for implicit `expect` that comes from @types/jest,
// but not for the explicitly imported one from @jest/globals; this fixes that.
declare module 'expect' {
    interface AsymmetricMatchers extends jest.Matchers<void> {}
    interface Matchers<R> extends jest.Matchers<R> {}
}
