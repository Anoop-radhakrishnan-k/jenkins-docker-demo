
import unittest
import app

class ApplicationTests(unittest.TestCase):
    def test_version_is_defined(self):
        self.assertTrue(app.VERSION)

    def test_application_name(self):
        self.assertEqual(
            "Jenkins CI/CD Demo",
            "Jenkins CI/CD Demo"
        )

if __name__ == "__main__":
    unittest.main()
