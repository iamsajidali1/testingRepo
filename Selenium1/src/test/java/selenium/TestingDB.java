package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

public class TestingDB {
    public static void main(String[] args) throws Exception{
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        Thread.sleep(1000);
        driver.get("https://www.youtube.com/");
        Thread.sleep(1000);
//        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
//        driver.manage().timeouts().implicitlyWait(10,Duration.ofSeconds());
        WebDriver.Timeouts timeouts = driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(20));
        timeouts.implicitlyWait(Duration.ofSeconds(5));
        driver.findElement((By.xpath("//a[@title='Shorts']"))).click();
//
//        Thread.sleep(4000);
        timeouts.implicitlyWait(Duration.ofSeconds(5));
        driver.findElement((By.xpath("//a[@title='Home']"))).click();

        driver.findElement(By.xpath("//div[text()='Music']")).click();
//        Thread.sleep(4000);
        timeouts.implicitlyWait(Duration.ofSeconds(5));
        driver.findElement(By.xpath("(//a[@id='video-title-link'])[2]")).click();



//        driver.close();
    }
}
