pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat '"C:\\Users\\ANOOP\\AppData\\Local\\Programs\\Python\\Python311\\python.exe" -m pip install -r requirements.txt'
            }
        }

        stage('Run Tests') {
            steps {
                bat '"C:\\Users\\ANOOP\\AppData\\Local\\Programs\\Python\\Python311\\python.exe" -m pytest -v'
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t jenkins-docker-demo:1.0 .'
            }
        }
    }
}