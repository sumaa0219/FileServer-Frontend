export default {
    async rewrites() {
        console.log('Applying rewrites...');
        return [
            {
                source: '/drive/:path*',
                destination: 'https://sssumaa.com/drive/:path*', // GoサーバーのURLにリダイレクト
            },
        ];
    },
};
