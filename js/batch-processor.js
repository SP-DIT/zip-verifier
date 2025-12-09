// Batch Processor Module
class BatchProcessor {
    constructor(batchSize = 4) {
        this.batchSize = batchSize;
        this.queue = [];
        this.results = new Map();
        this.progressCallback = null;
        this.completedCount = 0;
        this.failedCount = 0;
    }

    async extractStudentSubmissions(bulkZip) {
        const submissions = [];
        const files = Object.keys(bulkZip.files);

        for (const fileName of files) {
            if (fileName.endsWith('.zip') && !bulkZip.files[fileName].dir) {
                try {
                    const zipFile = bulkZip.files[fileName];
                    const zipData = await zipFile.async('arraybuffer');
                    const studentId = this.extractStudentId(fileName);

                    submissions.push({
                        id: studentId,
                        fileName: fileName,
                        zipData: zipData,
                        status: 'pending',
                        results: null,
                        error: null,
                    });
                } catch (error) {
                    console.error(`Failed to extract ${fileName}:`, error);
                    submissions.push({
                        id: this.extractStudentId(fileName),
                        fileName: fileName,
                        zipData: null,
                        status: 'error',
                        results: null,
                        error: `Failed to extract ZIP: ${error.message}`,
                    });
                }
            }
        }

        return submissions;
    }

    extractStudentId(fileName) {
        // Extract student ID from filename
        // Common patterns: "student123.zip", "123456_assignment.zip", "John_Doe_submission.zip"
        const nameWithoutExtension = fileName.replace(/\.zip$/i, '');

        // Try to extract student ID patterns
        const patterns = [
            /^(\d+)/, // Numbers at start
            /student(\d+)/i, // "student123"
            /(\d{6,})/, // 6+ digit numbers (student IDs)
            /([^_/\\]+)/, // First part before underscore/slash
        ];

        for (const pattern of patterns) {
            const match = nameWithoutExtension.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }

        return nameWithoutExtension; // Fallback to filename
    }

    addSubmissions(submissions) {
        this.queue.push(...submissions);
        return submissions.length;
    }

    async processAll(progressCallback) {
        this.progressCallback = progressCallback;
        this.completedCount = 0;
        this.failedCount = 0;

        if (this.queue.length === 0) {
            return this.results;
        }

        // Update initial progress
        this.updateProgress();

        // Process in batches
        const batches = this.createBatches();

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            await this.processBatch(batches[batchIndex], batchIndex);

            // Small delay between batches to prevent browser freeze
            if (batchIndex < batches.length - 1) {
                await this.delay(100);
            }
        }

        return this.results;
    }

    createBatches() {
        const batches = [];
        for (let i = 0; i < this.queue.length; i += this.batchSize) {
            batches.push(this.queue.slice(i, i + this.batchSize));
        }
        return batches;
    }

    async processBatch(batch, batchIndex) {
        const promises = batch.map((submission, index) => {
            return this.processSubmission(submission, batchIndex * this.batchSize + index);
        });

        await Promise.allSettled(promises);
    }

    async processSubmission(submission, index) {
        try {
            // Update status to processing
            submission.status = 'processing';
            this.updateProgress();

            if (!submission.zipData) {
                throw new Error('No ZIP data available');
            }

            // Load and process the student's ZIP
            const studentZip = await JSZip.loadAsync(submission.zipData);

            // Use existing assignment grader to process
            const consoleManager = new ConsoleManager(console);
            const testExecutor = new TestExecutor(consoleManager);
            const fileUtils = new FileUtils();
            const grader = new AssignmentGrader(testExecutor, fileUtils, document);

            // Analyze and process the assignment
            const structureAnalysis = grader.analyzeZipStructure(studentZip);

            if (!structureAnalysis.valid) {
                submission.status = 'error';
                submission.error = structureAnalysis.error;
                this.failedCount++;
            } else {
                const assignmentStructure = grader.extractAssignmentStructure(studentZip);

                if (assignmentStructure.length === 0) {
                    submission.status = 'error';
                    submission.error = 'No valid assignment structure found';
                    this.failedCount++;
                } else {
                    // Process each question
                    const questionResults = {};
                    let totalScore = 0;
                    let maxScore = 0;

                    for (const item of assignmentStructure) {
                        try {
                            const codeContent = await studentZip.file(item.codeFile).async('string');
                            const testContent = await studentZip.file(item.testFile).async('string');

                            const results = testExecutor.executeTests(codeContent, testContent);

                            const questionScore = results.error ? 0 : results.passed;
                            const questionMaxScore = results.error ? 0 : results.passed + results.failed;

                            questionResults[item.question] = {
                                status: results.error ? 'error' : results.failed === 0 ? 'passed' : 'partial',
                                score: questionScore,
                                maxScore: questionMaxScore,
                                passed: results.passed || 0,
                                failed: results.failed || 0,
                                error: results.error || null,
                                testCases: results.testCases || [],
                            };

                            totalScore += questionScore;
                            maxScore += questionMaxScore;
                        } catch (error) {
                            questionResults[item.question] = {
                                status: 'error',
                                score: 0,
                                maxScore: 0,
                                passed: 0,
                                failed: 0,
                                error: error.message,
                                testCases: [],
                            };
                        }
                    }

                    submission.status = 'completed';
                    submission.results = {
                        questions: questionResults,
                        totalScore: totalScore,
                        maxScore: maxScore,
                        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
                        assignmentStructure: assignmentStructure,
                    };

                    this.completedCount++;
                }
            }

            // Store result
            this.results.set(submission.id, submission);
            this.updateProgress();
        } catch (error) {
            console.error(`Error processing ${submission.fileName}:`, error);
            submission.status = 'error';
            submission.error = error.message;
            this.failedCount++;
            this.results.set(submission.id, submission);
            this.updateProgress();
        }
    }

    updateProgress() {
        if (this.progressCallback) {
            const total = this.queue.length;
            const completed = this.completedCount;
            const failed = this.failedCount;
            const processing = this.queue.filter((s) => s.status === 'processing').length;
            const remaining = total - completed - failed - processing;

            this.progressCallback({
                total,
                completed,
                failed,
                processing,
                remaining,
                percentage: total > 0 ? Math.round(((completed + failed) / total) * 100) : 0,
                submissions: this.queue,
            });
        }
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    getResults() {
        return this.results;
    }

    getSummaryStats() {
        const submissions = Array.from(this.results.values());
        const successful = submissions.filter((s) => s.status === 'completed');
        const failed = submissions.filter((s) => s.status === 'error');

        const totalScore = successful.reduce((sum, s) => sum + (s.results?.totalScore || 0), 0);
        const totalMaxScore = successful.reduce((sum, s) => sum + (s.results?.maxScore || 0), 0);
        const averagePercentage =
            successful.length > 0
                ? successful.reduce((sum, s) => sum + (s.results?.percentage || 0), 0) / successful.length
                : 0;

        return {
            total: submissions.length,
            successful: successful.length,
            failed: failed.length,
            averageScore: Math.round(averagePercentage),
            totalScore,
            totalMaxScore,
        };
    }

    reset() {
        // Clear all state for new batch processing
        this.queue = [];
        this.results.clear();
        this.progressCallback = null;
        this.completedCount = 0;
        this.failedCount = 0;
    }
}
