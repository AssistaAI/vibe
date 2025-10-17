#!/usr/bin/env tsx
/**
 * Sync Templates to R2 Bucket
 *
 * This script uploads the template catalog to the R2 bucket to ensure
 * code generation has access to available templates.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const TEMPLATE_CATALOG_PATH = resolve(__dirname, '../templates/template_catalog.json');
const BUCKET_NAME = 'vibesdk-templates';
const OBJECT_KEY = 'template_catalog.json';

async function syncTemplates() {
    console.log('🔄 Syncing templates to R2 bucket...\n');

    if (!existsSync(TEMPLATE_CATALOG_PATH)) {
        console.error('❌ Error: Template catalog not found at:', TEMPLATE_CATALOG_PATH);
        console.error('   Run: cd templates && python generate_template_catalog.py');
        process.exit(1);
    }

    try {
        console.log(`📁 Template catalog: ${TEMPLATE_CATALOG_PATH}`);
        console.log(`🪣 R2 Bucket: ${BUCKET_NAME}`);
        console.log(`🔑 Object key: ${OBJECT_KEY}\n`);

        const command = `npx wrangler r2 object put ${BUCKET_NAME}/${OBJECT_KEY} --file ${TEMPLATE_CATALOG_PATH}`;

        console.log('⏳ Uploading...');
        execSync(command, { stdio: 'inherit' });

        console.log('\n✅ Template catalog synced successfully!');
        console.log('   You can now start code generation.\n');

        console.log('🔍 To verify:');
        console.log(`   npx wrangler r2 object get ${BUCKET_NAME}/${OBJECT_KEY} --file /tmp/verify.json`);

    } catch (error) {
        console.error('\n❌ Error syncing templates:', error);
        process.exit(1);
    }
}

syncTemplates();
