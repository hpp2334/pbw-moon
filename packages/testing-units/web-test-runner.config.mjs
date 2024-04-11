import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    concurrency: 10,
    nodeResolve: true,
    files: 'test/**/*.test.ts',
    rootDir: './',
    browsers: [
        playwrightLauncher({
            product: 'chromium',
        }),
        playwrightLauncher({ product: 'firefox' }),
        ...(process.env.TEST_WEBKIT ? [playwrightLauncher({ product: 'webkit' })] : []),
    ],
    plugins: [
        esbuildPlugin({ ts: true }),
    ],
    coverage: true,
    coverageConfig: {
        exclude: [
            'test-dependencies/**/*.*',
            'test/**/*.*'
        ],
        reporters: ['lcovonly', 'clover'],
    }
};