// Test Runner Service
class TestRunnerService {
    constructor(testExecutor, fileUtils, assignmentGrader = null) {
        this.testExecutor = testExecutor;
        this.fileUtils = fileUtils;
        this.assignmentGrader = assignmentGrader;
    }

    async runTestsForAssignment(zip, assignmentStructure) {
        const results = new Map();

        for (const item of assignmentStructure) {
            try {
                const result = await this.runTestsForQuestion(zip, item);
                results.set(item.question, result);
            } catch (error) {
                results.set(item.question, {
                    status: 'error',
                    error: error.message,
                    score: 0,
                    maxScore: 0,
                    passed: 0,
                    failed: 0,
                    testCases: [],
                });
            }
        }

        return this.calculateSummary(results);
    }

    async runTestsForQuestion(zip, questionItem) {
        const codeContent = await zip.file(questionItem.codeFile).async('string');
        const testContent = await zip.file(questionItem.testFile).async('string');

        const results = this.testExecutor.executeTests(codeContent, testContent);

        return {
            status: results.error ? 'error' : results.failed === 0 ? 'passed' : 'partial',
            score: results.error ? 0 : results.passed,
            maxScore: results.error ? 0 : results.passed + results.failed,
            passed: results.passed || 0,
            failed: results.failed || 0,
            error: results.error,
            testCases: results.testCases || [],
        };
    }

    calculateSummary(questionResults) {
        const questions = Object.fromEntries(questionResults);
        const totalScore = Object.values(questions).reduce((sum, q) => sum + q.score, 0);
        const maxScore = Object.values(questions).reduce((sum, q) => sum + q.maxScore, 0);

        return {
            questions,
            totalScore,
            maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        };
    }

    formatTestValue(value) {
        if (Array.isArray(value)) {
            return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
        }
        return JSON.stringify(value);
    }

    analyzeAssignmentStructure(zip) {
        const structureAnalysis = this.assignmentGrader.analyzeZipStructure(zip);
        const hasAssignmentStructure = this.assignmentGrader.detectAssignmentStructure(zip);

        return {
            isValid: structureAnalysis.valid,
            hasAssignmentStructure: hasAssignmentStructure,
            error: structureAnalysis.error,
        };
    }

    processAssignmentWithUI(zip) {
        this.assignmentGrader.runTestsOnAssignment(zip);
    }

    async processSubmissionTests(submission, studentZip) {
        try {
            // Analyze and process the assignment
            const structureAnalysis = this.assignmentGrader.analyzeZipStructure(studentZip);

            if (!structureAnalysis.valid) {
                return {
                    status: 'error',
                    error: structureAnalysis.error,
                    results: null,
                };
            }

            const assignmentStructure = this.assignmentGrader.extractAssignmentStructure(studentZip);

            if (assignmentStructure.length === 0) {
                return {
                    status: 'error',
                    error: 'No valid assignment structure found',
                    results: null,
                };
            }

            // Process each question
            const results = await this.runTestsForAssignment(studentZip, assignmentStructure);

            return {
                status: 'completed',
                results: {
                    ...results,
                    assignmentStructure: assignmentStructure,
                },
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                results: null,
            };
        }
    }
}
