function emit(record) {
  console.error(`[CRITICAL] ${JSON.stringify(record)}`);
}
function reportCriticalFailure(source, error, context = {}) {
  emit({
    level: "critical",
    source,
    message: error && error.message || String(error),
    context,
    timestamp: (new Date()).toISOString()
  });
}
export {
  reportCriticalFailure
};
