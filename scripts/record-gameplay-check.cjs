// Retain observations made before an assertion fails, without marking them passed.
async function recordGameplayCheck(checks, name, action, continueOnFailure = false) {
  let observed;
  try {
    const detail = await action(value => { observed = value; });
    checks.push({ name, status: 'passed', detail });
  } catch (error) {
    const result = { name, status: 'failed', message: error.message };
    if (observed !== undefined) result.detail = observed;
    checks.push(result);
    if (!continueOnFailure) throw error;
  }
}
module.exports = { recordGameplayCheck };
