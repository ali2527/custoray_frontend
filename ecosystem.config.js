module.exports = {
  apps: [
    {
      name: "custoray_frontend_dev",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "customdev",
      },
    },
  ],
};
