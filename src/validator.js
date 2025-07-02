
export class JSONValidator {
    static validate(jsonString) {
        if (!jsonString || jsonString.trim() === '') {
            return {
                valid: false,
                error: 'Empty input',
                errorType: 'empty'
            };
        }

        try {
            const parsed = JSON.parse(jsonString);
            
            if (typeof parsed !== 'object' || parsed === null) {
                return {
                    valid: false,
                    error: 'Root must be an object or array',
                    errorType: 'invalid_root',
                    data: parsed
                };
            }

            return {
                valid: true,
                data: parsed
            };
        } catch (error) {
            return {
                valid: false,
                error: this.formatParseError(error.message),
                errorType: 'parse_error',
                originalError: error.message
            };
        }
    }

    static formatParseError(message) {
        const errorMappings = {
            'Unexpected token': 'Invalid JSON syntax',
            'Unexpected end of JSON input': 'Incomplete JSON - missing closing brackets or quotes',
            'Expected property name': 'Missing property name or quotes around property name',
            'Unexpected string': 'Invalid string format or missing comma'
        };

        for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
            if (message.includes(pattern)) {
                return friendlyMessage;
            }
        }

        return message;
    }
}
