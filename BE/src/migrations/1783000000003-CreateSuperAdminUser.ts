import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class CreateSuperAdminUser1783000000003 implements MigrationInterface {
  name = 'CreateSuperAdminUser1783000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if Super Admin already exists
    const existingUser = await queryRunner.query(
      `SELECT id FROM \`users\` WHERE \`userName\` = 'superadmin' OR \`email\` = 'superadmin@puravankara.com'`
    );

    if (existingUser.length > 0) {
      console.log('Super Admin already exists, skipping creation');
      return;
    }

    // Check if role exists
    const role = await queryRunner.query(
      `SELECT id FROM \`roles\` WHERE \`name\` = 'Super Admin' LIMIT 1`
    );

    let roleId = null;
    if (role.length > 0) {
      roleId = role[0].id;
    }

    // Check if department exists
    const dept = await queryRunner.query(
      `SELECT id FROM \`departments\` WHERE \`name\` = 'Administration' LIMIT 1`
    );

    let departmentId = null;
    if (dept.length > 0) {
      departmentId = dept[0].id;
    }

    // Check if zone exists
    const zone = await queryRunner.query(
      `SELECT id FROM \`zones\` WHERE \`code\` = 'corporate' LIMIT 1`
    );

    let zoneId = null;
    if (zone.length > 0) {
      zoneId = zone[0].id;
    }

    // Insert Super Admin user
    await queryRunner.query(`
      INSERT INTO \`users\` (
        \`user_id\`, \`name\`, \`username\`, \`email\`, \`password\`, \`status\`,
        \`role_id\`, \`department_id\`, \`zone_id\`, \`emp_code\`, \`created_at\`, \`updated_at\`
      ) VALUES (
        'SUPERADMIN001', 'Super Admin', 'superadmin', 'superadmin@puravankara.com', ?, 'active',
        ?, ?, ?, 'SA001', NOW(), NOW()
      )
    `, [hashedPassword, roleId, departmentId, zoneId]);

    console.log('Super Admin created successfully');
    console.log('Username: superadmin');
    console.log('Email: superadmin@puravankara.com');
    console.log('Password: Admin@123');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`users\` WHERE \`userName\` = 'superadmin' OR \`email\` = 'superadmin@puravankara.com'
    `);
  }
}