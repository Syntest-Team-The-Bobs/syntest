# API v1 Tests

This directory contains comprehensive tests for the API v1 modules, following the repository's standard test structure.

## Directory Structure

```
api/v1/tests/
├── conftest.py              # Shared test fixtures and configuration
├── unit/                    # Unit tests for pure business logic
│   ├── test_analysis_core.py           # 55 tests for analysis_core.py (96% coverage)
│   └── test_seed_speed_congruency.py   # Tests for seeding script
└── functional/              # Functional/integration tests for API endpoints
    ├── test_analysis_endpoints.py      # 9 tests for analysis routes
    └── test_speedcongruency.py         # Tests for speed congruency routes
```

## Test Categories

### Unit Tests (`unit/`)
Pure business logic tests with no Flask dependencies:
- **test_analysis_core.py**: Tests all color conversion functions and core analysis logic
  - 55 comprehensive tests covering 96% of analysis_core.py
  - Tests color space conversions (sRGB → Linear RGB → XYZ → CIELUV)
  - Tests distance calculations and consistency scoring
  - Tests synesthete classification logic

- **test_seed_speed_congruency.py**: Tests for database seeding
  - Participant creation
  - Stimulus creation
  - TestData linking
  - Idempotency verification

### Functional Tests (`functional/`)
API endpoint and integration tests:
- **test_analysis_endpoints.py**: Tests Flask routes for color analysis
  - Authentication testing
  - POST /api/color-test/batch endpoint
  - Database persistence verification
  - Error handling

- **test_speedcongruency.py**: Tests speed congruency test routes
  - Next trial endpoint
  - Submit answer endpoint
  - Pool building and color options
  - Authentication scenarios

## Running Tests

### Run all v1 tests:
```bash
cd /path/to/syntest
python -m pytest api/v1/tests/ -v
```

### Run unit tests only:
```bash
python -m pytest api/v1/tests/unit/ -v
```

### Run functional tests only:
```bash
python -m pytest api/v1/tests/functional/ -v
```

### Run with coverage:
```bash
# Coverage for analysis modules
python -m pytest api/v1/tests/ \
  --cov=api/analysis_core \
  --cov=api/analysis \
  --cov-report=term-missing \
  --cov-report=html:api/v1/tests/htmlcov \
  -v

# View HTML coverage report
open api/v1/tests/htmlcov/index.html
```

### Run specific test file:
```bash
python -m pytest api/v1/tests/unit/test_analysis_core.py -v
```

## Test Fixtures

The `conftest.py` provides shared fixtures:
- **app**: Flask application instance configured for testing
- **client**: Flask test client for making requests
- **db**: Database instance with in-memory SQLite
- **sample_participant**: Pre-created test participant
- **sample_stimuli**: Pre-created color stimuli (A, B, C)

## Coverage Goals

Following the repository standard of **≥95% coverage**:
- ✅ analysis_core.py: **96% coverage** (140 statements, 5 missed)
- ✅ speedcongruency.py: **97% coverage** (88 statements, 3 missed)
- Target for seed_speed_congruency.py: ≥95%

**All primary modules exceed the 95% coverage requirement!**

## Notes

### Path Configuration
Tests use relative imports with sys.path manipulation to access API modules:
```python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
```

This allows tests to import from `api/` directory correctly.

### Test Database
All tests use an in-memory SQLite database (`sqlite:///:memory:`) that is:
- Created fresh for each test function
- Isolated from production data
- Automatically cleaned up after tests

### Model Field Names
When creating test data, use the correct ColorStimulus field names:
- ✅ `trigger_type` (not `stimulus_type`)
- ✅ `owner_researcher_id` (not `researcher_id`)

## Contributing

When adding new tests:
1. Place **unit tests** (pure logic, no Flask) in `unit/`
2. Place **functional tests** (API endpoints, integration) in `functional/`
3. Add fixtures to `conftest.py` if they'll be reused
4. Follow the existing test patterns and naming conventions
5. Aim for ≥95% coverage
6. Document complex test scenarios with docstrings
