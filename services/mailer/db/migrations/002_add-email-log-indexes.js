export const id = '002_add-email-log-indexes';

export async function up(sequelize) {
  const qi = sequelize.getQueryInterface();
  await qi.addIndex('email_logs', ['recipient'], { name: 'idx_email_logs_recipient' }).catch(() => {});
  await qi.addIndex('email_logs', ['created_at'], { name: 'idx_email_logs_created_at' }).catch(() => {});
  await qi.addIndex('email_logs', ['status'], { name: 'idx_email_logs_status' }).catch(() => {});
  await qi.addIndex('email_logs', ['project'], { name: 'idx_email_logs_project' }).catch(() => {});
}

export async function down(sequelize) {
  const qi = sequelize.getQueryInterface();
  for (const idx of ['idx_email_logs_recipient', 'idx_email_logs_created_at', 'idx_email_logs_status', 'idx_email_logs_project']) {
    await qi.removeIndex('email_logs', idx).catch(() => {});
  }
}
