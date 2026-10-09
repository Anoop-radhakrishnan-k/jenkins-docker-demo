
pipeline {
    agent any

    parameters {
        choice(
            name: 'DEPLOY_ACTION',
            choices: ['deploy', 'bad-deploy', 'rollback'],
            description: 'Select deployment action'
        )
    }

    environment {
        IMAGE_NAME = 'jenkins-docker-demo'
        SERVICE_NAME = 'cicd-demo'
        DOCKER_CLI = 'C:\\Users\\ANOOP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'GitHub source code checked out.'
            }
        }

        stage('Build') {
            when {
                expression { params.DEPLOY_ACTION != 'rollback' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    node --version
                    npm --version
                    npm test
                    if ($LASTEXITCODE -ne 0) {
                        throw "Application tests failed"
                    }
                '''
            }
        }

        stage('Test') {
            when {
                expression { params.DEPLOY_ACTION != 'rollback' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    npm test
                    if ($LASTEXITCODE -ne 0) {
                        throw "Automated tests failed"
                    }
                '''
            }
        }

        stage('Docker Build') {
            when {
                expression { params.DEPLOY_ACTION != 'rollback' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $docker = $env:DOCKER_CLI

                    & $docker info
                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker Engine unavailable"
                    }

                    $image = "$env:IMAGE_NAME`:$env:BUILD_NUMBER"

                    & $docker build -t $image .
                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker build failed"
                    }

                    & $docker image ls $env:IMAGE_NAME
                '''
            }
        }

        stage('Deploy') {
            when {
                expression { params.DEPLOY_ACTION != 'rollback' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $docker = $env:DOCKER_CLI
                    $service = $env:SERVICE_NAME
                    $image = "$env:IMAGE_NAME`:$env:BUILD_NUMBER"

                    $swarm = & $docker info --format '{{.Swarm.LocalNodeState}}'
                    if ($LASTEXITCODE -ne 0) {
                        throw "Cannot connect to Docker"
                    }

                    if ($swarm.Trim() -ne "active") {
                        & $docker swarm init
                        if ($LASTEXITCODE -ne 0) {
                            throw "Swarm initialization failed"
                        }
                    }

                    $services = @(& $docker service ls --format '{{.Name}}')
                    if ($LASTEXITCODE -ne 0) {
                        throw "Cannot list Docker services"
                    }

                    $exists = $services -contains $service

                    if ($env:DEPLOY_ACTION -eq "bad-deploy") {
                        if (-not $exists) {
                            throw "Deploy a working version first"
                        }

                        & $docker service update `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --image nginx:nonexistent-cicd-tag `
                            $service

                        throw "Controlled deployment issue introduced. Run rollback."
                    }

                    if (-not $exists) {
                        & $docker service create `
                            --name $service `
                            --replicas 3 `
                            --publish published=8081,target=3000 `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --env "APP_VERSION=$env:BUILD_NUMBER" `
                            $image

                        if ($LASTEXITCODE -ne 0) {
                            throw "Initial service creation failed"
                        }
                    }
                    else {
                        & $docker service update `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --env-rm APP_VERSION `
                            --env-add "APP_VERSION=$env:BUILD_NUMBER" `
                            --image $image `
                            $service

                        if ($LASTEXITCODE -ne 0) {
                            throw "Service update failed"
                        }
                    }

                    & $docker service ps $service
                    if ($LASTEXITCODE -ne 0) {
                        throw "Cannot read service status"
                    }
                '''
            }
        }

        stage('Verify') {
            when {
                expression { params.DEPLOY_ACTION == 'deploy' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $verified = $false

                    for ($i = 0; $i -lt 30; $i++) {
                        $tasks = @(& $env:DOCKER_CLI service ps `
                            --filter "desired-state=running" `
                            --format '{{.CurrentState}}' `
                            $env:SERVICE_NAME)

                        $running = @($tasks | Where-Object {
                            $_ -match '^Running'
                        }).Count

                        try {
                            $response = Invoke-RestMethod `
                                -Uri "http://localhost:8081/health" `
                                -TimeoutSec 3

                            if ($running -ge 3 -and
                                $response.status -eq "healthy" -and
                                "$($response.version)" -eq "$env:BUILD_NUMBER") {
                                $verified = $true
                                break
                            }
                        }
                        catch {
                            Write-Host "Waiting for application health check..."
                        }

                        Start-Sleep -Seconds 3
                    }

                    & $env:DOCKER_CLI service ps $env:SERVICE_NAME

                    if (-not $verified) {
                        throw "Deployment verification failed. Check port 8081 and service logs."
                    }

                    Write-Host "New application version verified."
                    Invoke-RestMethod "http://localhost:8081/health"
                '''
            }
        }

        stage('Rollback') {
            when {
                expression { params.DEPLOY_ACTION == 'rollback' }
            }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $docker = $env:DOCKER_CLI
                    $service = $env:SERVICE_NAME

                    $services = @(& $docker service ls --format '{{.Name}}')
                    if ($LASTEXITCODE -ne 0) {
                        throw "Cannot list Docker services"
                    }

                    if ($services -notcontains $service) {
                        throw "Service cicd-demo does not exist. Run deploy first."
                    }

                    & $docker service rollback $service
                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker service rollback failed"
                    }

                    & $docker service ps $service

                    $verified = $false
                    for ($i = 0; $i -lt 30; $i++) {
                        try {
                            $response = Invoke-RestMethod `
                                -Uri "http://localhost:8081/health" `
                                -TimeoutSec 3

                            if ($response.status -eq "healthy") {
                                $verified = $true
                                break
                            }
                        }
                        catch {
                            Write-Host "Waiting for rollback health check..."
                        }

                        Start-Sleep -Seconds 3
                    }

                    if (-not $verified) {
                        throw "Rollback health verification failed"
                    }

                    Write-Host "Rollback completed; health check passed."
                    Invoke-RestMethod "http://localhost:8081/health"
                '''
            }
        }
    }

    post {
        success {
            echo 'Selected pipeline action completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
        always {
            echo 'CI/CD pipeline execution finished.'
        }
    }
}
