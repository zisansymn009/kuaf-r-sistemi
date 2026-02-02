const { initDatabase, run, closeDatabase } = require('./database/db');

async function testInsert() {
    try {
        await initDatabase();

        const staffId = 3; // Ayşe
        const day = 0; // Sunday

        console.log(`Inserting/Updating for Staff ${staffId}, Day ${day}...`);

        await run(
            'INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, is_off) ' +
            'VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT(staff_id, day_of_week) DO UPDATE SET ' +
            'start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_off = EXCLUDED.is_off',
            [staffId, day, '10:00', '18:00', 0]
        );

        console.log("Success! Data inserted/updated.");

    } catch (err) {
        console.error("FAILED:", err);
    } finally {
        await closeDatabase();
    }
}

testInsert();
