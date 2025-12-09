// Results Export Service
class ResultsExporter {
    constructor() {
        // No dependencies needed for this service
    }

    exportToCSV(results) {
        const headers = [
            'Student ID',
            'Filename',
            'Status',
            'Overall Score (%)',
            'Questions Attempted',
            'Questions Passed',
            'Total Points',
            'Max Points',
            'Error Message',
        ];

        const rows = [headers];

        results.forEach((result) => {
            const questions = result.results?.questions || {};
            const questionKeys = Object.keys(questions);
            const passedQuestions = questionKeys.filter((q) => questions[q].status === 'passed').length;

            const row = [
                result.id,
                result.fileName,
                result.status,
                result.results?.percentage || '0',
                questionKeys.length,
                passedQuestions,
                result.results?.totalScore || '0',
                result.results?.maxScore || '0',
                result.error || '',
            ];

            rows.push(row);
        });

        const csvContent = rows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadFile('batch_results.csv', csvContent, 'text/csv');
    }

    exportToJSON(results) {
        const jsonContent = JSON.stringify(results, null, 2);
        this.downloadFile('batch_results.json', jsonContent, 'application/json');
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
