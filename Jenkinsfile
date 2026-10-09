pipeline {
    agent any

    parameters {
        choice(
            name: 'DEPLOY_ACTION',
            choices: ['deploy', 'bad-deploy', 'rollback'],
            description: 'Choose the CI/CD action'
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
                        throw "Application build/test preparation failed"
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

                    if (!(Test-Path $env:DOCKER_CLI)) {
                        throw "Docker CLI not found at $env:DOCKER_CLI"
                    }

                    & $env:DOCKER_CLI info
                    if ($LASTEXITCODE -ne 0) {
                        throw "Jenkins cannot connect to Docker Engine"
                    }

                    $image = "$env:IMAGE_NAME`:$env:BUILD_NUMBER"

                    & $env:DOCKER_CLI build -t $image .
                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker image build failed"
                    }

                    & $env:DOCKER_CLI image ls $env:IMAGE_NAME
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

                    $swarm = & $env:DOCKER_CLI info --format '{{.Swarm.LocalNodeState}}'
                    if ($LASTEXITCODE -ne 0) {
                        throw "Unable to read Docker Swarm state"
                    }

                    if ($swarm.Trim() -ne "active") {
                        & $env:DOCKER_CLI swarm init
                        if ($LASTEXITCODE -ne 0) {
                            throw "Docker Swarm initialization failed"
                        }
                    }

                    $existing = & $env:DOCKER_CLI service inspect $env:SERVICE_NAME 2>$null
                    $serviceExists = ($LASTEXITCODE -eq 0)

                    if (-not $serviceExists) {
                        if ($env:DEPLOY_ACTION -eq "bad-deploy") {
                            throw "Deploy a working version before simulating failure"
                        }

                        $image = "$env:IMAGE_NAME`:$env:BUILD_NUMBER"

                        & $env:DOCKER_CLI service create `
                            --name $env:SERVICE_NAME `
                            --replicas 3 `
                            --publish published=8080,target=3000 `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --env "APP_VERSION=$env:BUILD_NUMBER" `
                            $image

                        if ($LASTEXITCODE -ne 0) {
                            throw "Service creation failed"
                        }
                    }
                    elseif ($env:DEPLOY_ACTION -eq "bad-deploy") {
                        & $env:DOCKER_CLI service update `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --image nginx:nonexistent-cicd-tag `
                            $env:SERVICE_NAME

                        throw "Controlled failure introduced. Run rollback next."
                    }
                    else {
                        $image = "$env:IMAGE_NAME`:$env:BUILD_NUMBER"

                        & $env:DOCKER_CLI service update `
                            --update-parallelism 1 `
                            --update-delay 10s `
                            --env-rm APP_VERSION `
                            --env-add "APP_VERSION=$env:BUILD_NUMBER" `
                            --image $image `
                            $env:SERVICE_NAME

                        if ($LASTEXITCODE -ne 0) {
                            throw "Service update failed"
                        }
                    }

                    & $env:DOCKER_CLI service ps $env:SERVICE_NAME
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
                        $tasks = & $env:DOCKER_CLI service ps `
                            --filter "desired-state=running" `
                            --format '{{.CurrentState}}' $env:SERVICE_NAME

                        $running = @($tasks | Where-Object {
                            $_ -match '^Running'
                        }).Count

                        try {
                            $r = Invoke-RestMethod `
                                -Uri "http://localhost:8080/health" `
                                -TimeoutSec 3

                            if ($running -ge 3 -and
                                $r.status -eq "healthy" -and
                                "$($r.version)" -eq "$env:BUILD_NUMBER") {
                                $verified = $true
                                break
                            }
                        }
                        catch {
                            Start-Sleep -Seconds 5
                        }

                        Start-Sleep -Seconds 3
                    }

                    & $env:DOCKER_CLI service ps $env:SERVICE_NAME

                    if (-not $verified) {
                        throw "Deployment verification failed"
                    }

                    Write-Host "New version verified successfully."
                    Invoke-RestMethod -Uri "http://localhost:8080/health"
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

                    & $env:DOCKER_CLI service rollback $env:SERVICE_NAME
                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker service rollback failed"
                    }

                    $verified = $false

                    for ($i = 0; $i -lt 30; $i++) {
                        try {
                            $r = Invoke-RestMethod `
                                -Uri "http://localhost:8080/health" `
                                -TimeoutSec 3

                            if ($r.status -eq "healthy") {
                                $verified = $true
                                break
                            }
                        }
                        catch {
                            Start-Sleep -Seconds 5
                        }

                        Start-Sleep -Seconds 3
                    }

                    & $env:DOCKER_CLI service ps $env:SERVICE_NAME

                    if (-not $verified) {
                        throw "Rollback health verification failed"
                    }

                    Write-Host "Rollback completed; health check passed."
                    Invoke-RestMethod -Uri "http://localhost:8080/health"
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