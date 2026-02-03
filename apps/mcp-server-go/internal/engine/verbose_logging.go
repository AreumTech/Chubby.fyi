package engine

// Simulation verbosity level (0=verbose, 1=event, 2=monthly, 3=path)
var SIMULATION_VERBOSITY = 3

func simLogVerbose(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 0 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogEvent(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 1 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogMonthly(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 2 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogPath(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 3 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLog(format string, args ...interface{}) {
	DebugPrintf(format+"\n", args...)
}
