
pipeline {
    agent any

    parameters {
        string(
            name: 'APP_VERSION',
            defaultValue: '1.0',
            description: 'Version displayed by the application'
        )
    }

    environment {
        IMAGE_NAME = 'cicd-demo'
        SERVICE_NAME = 'cicd-demo'
        APP_PORT = '8088'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                bat 'git log -1 --oneline'
            }
        }

        stage('Test') {
            steps {
                bat '''
                    docker run --rm ^
                      --mount "type=bind,source=%WORKSPACE%,target=/src" ^
                      -w /src ^
                      python:3.12-slim ^
                      python -m unittest -v test_app
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                bat '''
                    docker build -t %IMAGE_NAME%:%BUILD_NUMBER% .
                    docker image ls %IMAGE_NAME%
                '''
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                    docker info
                    docker swarm init 2>nul
                    if errorlevel 1 (
                        docker info --format "{{.Swarm.LocalNodeState}}" | findstr /i "active"
                        if errorlevel 1 exit /b 1
                    )
                '''

                script {
                    bat '''
                        docker service inspect %SERVICE_NAME% >nul 2>nul
                        if errorlevel 1 (
                            docker service create ^
                              --name %SERVICE_NAME% ^
                              --replicas 2 ^
                              --publish published=8088,target=8000 ^
                              --env APP_VERSION=%APP_VERSION% ^
                              --update-parallelism 1 ^
                              --update-delay 10s ^
                              --update-order start-first ^
                              --update-failure-action rollback ^
                              %IMAGE_NAME%:%BUILD_NUMBER%
                            if errorlevel 1 exit /b 1
                        ) else (
                            docker service update ^
                              --image %IMAGE_NAME%:%BUILD_NUMBER% ^
                              --env-add APP_VERSION=%APP_VERSION% ^
                              --update-parallelism 1 ^
                              --update-delay 10s ^
                              --update-order start-first ^
                              --update-failure-action rollback ^
                              %SERVICE_NAME%
                            if errorlevel 1 exit /b 1
                        )
                    '''
                }

                bat 'docker service ps %SERVICE_NAME%'
            }
        }

        stage('Verify') {
            steps {
                bat '''
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 24;$i++){try{$r=Invoke-RestMethod 'http://localhost:8088/'; if($r.status -eq 'Running' -and $r.version -eq $env:APP_VERSION){$r | ConvertTo-Json; $ok=$true; break}}catch{}; Start-Sleep -Seconds 5}; if(-not $ok){throw 'Application verification failed'}"
                '''
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
