package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Action;
import org.openqa.selenium.interactions.Actions;

public class mouseAction2 {
    public static void main(String[] args) throws Exception{
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        Thread.sleep(1000);
        driver.get("https://www.emicalculator.net/");
        Thread.sleep(1000);
        WebElement sliderElement = driver.findElement(By.xpath(("//div[@id='loanamountslider']")));
        Actions actions  =new Actions(driver);
        Action action = actions.dragAndDropBy(sliderElement,60,0).build();
        action.perform();


        Thread.sleep(3000);
        driver.close();
    }
}
