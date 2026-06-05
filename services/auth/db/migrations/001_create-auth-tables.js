export async function up(queryInterface, DataTypes) {
    await queryInterface.createTable('users', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        password: { type: DataTypes.STRING(255), allowNull: true },
        verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        remember_token: { type: DataTypes.STRING(255), allowNull: true },
        contact_email: { type: DataTypes.STRING(255), allowNull: true },
        is_guest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        previous_password: { type: DataTypes.STRING(255), allowNull: true },
        totp_secret: { type: DataTypes.STRING(255), allowNull: true },
        totp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
    });

    await queryInterface.createTable('login_attempts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING(255), allowNull: false },
        ip: { type: DataTypes.STRING(45), allowNull: false },
        count: { type: DataTypes.INTEGER, defaultValue: 0 },
        blocked_until: { type: DataTypes.BIGINT, defaultValue: 0 },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
    });
    await queryInterface.addIndex('login_attempts', ['email', 'ip']);

    await queryInterface.createTable('login_logs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        email: { type: DataTypes.STRING(255), allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false },
        ip: { type: DataTypes.STRING(45), allowNull: true },
        forwarded_ip: { type: DataTypes.STRING(255), allowNull: true },
        user_agent: { type: DataTypes.TEXT, allowNull: true },
        origin: { type: DataTypes.STRING(255), allowNull: true },
        accept_language: { type: DataTypes.STRING(100), allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
    });
    await queryInterface.addIndex('login_logs', ['user_id']);
    await queryInterface.addIndex('login_logs', ['created_at']);
}

export async function down(queryInterface) {
    await queryInterface.dropTable('login_logs');
    await queryInterface.dropTable('login_attempts');
    await queryInterface.dropTable('users');
}
